"""Isolated Python code runner for PyLearn Pro assignment grading."""

from __future__ import annotations

import base64
import json
import os
import secrets
import threading
from typing import Any

import modal
from fastapi import HTTPException, Request

app = modal.App("pylearn-python-grader")
api_image = modal.Image.debian_slim(python_version="3.12").pip_install("fastapi[standard]")
python_image = modal.Image.debian_slim(python_version="3.12")

# Fixed harness runs as the trusted controller inside each short-lived sandbox.
# It launches the learner program as a child, caps CPU, memory, process count,
# wall time, and captured output, and never evaluates code in the API process.
HARNESS = r'''import base64, json, os, resource, selectors, signal, subprocess, sys, threading, time

source = base64.b64decode(sys.argv[1])
stdin_data = base64.b64decode(sys.argv[2])

def limits():
    resource.setrlimit(resource.RLIMIT_CPU, (3, 3))
    resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024, 128 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
    resource.setrlimit(resource.RLIMIT_NPROC, (8, 8))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))

proc = subprocess.Popen(
    [sys.executable, "-I", "-c", source.decode("utf-8")],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    preexec_fn=limits, close_fds=True,
)
try:
    proc.stdin.write(stdin_data)
    proc.stdin.close()
except BrokenPipeError:
    pass

captured = {"stdout": bytearray(), "stderr": bytearray()}
overflow = threading.Event()
def capture(name, stream):
    while True:
        chunk = stream.read(4096)
        if not chunk:
            return
        remaining = 16384 - len(captured[name])
        if remaining > 0:
            captured[name].extend(chunk[:remaining])
        if len(chunk) > remaining:
            overflow.set()
            try: proc.kill()
            except ProcessLookupError: pass

readers = [threading.Thread(target=capture, args=("stdout", proc.stdout), daemon=True),
           threading.Thread(target=capture, args=("stderr", proc.stderr), daemon=True)]
for thread in readers: thread.start()
timed_out = False
try:
    proc.wait(timeout=3.2)
except subprocess.TimeoutExpired:
    timed_out = True
    proc.kill()
    proc.wait()
for thread in readers: thread.join(timeout=1)
print(json.dumps({
    "stdout": captured["stdout"].decode("utf-8", "replace"),
    "stderr": captured["stderr"].decode("utf-8", "replace"),
    "exitCode": proc.returncode,
    "timedOut": timed_out,
    "outputLimited": overflow.is_set(),
}))
'''


def _run_one(app_obj: modal.App, source: str, stdin: str) -> dict[str, Any]:
    sandbox = modal.Sandbox.create(
        app=app_obj,
        image=python_image,
        block_network=True,
        cpu=0.5,
        memory=256,
        timeout=10,
    region="ap-south",
        runtime="gvisor",
    )
    try:
        encoded_source = base64.b64encode(source.encode("utf-8")).decode("ascii")
        encoded_stdin = base64.b64encode(stdin.encode("utf-8")).decode("ascii")
        process = sandbox.exec(
            "python", "-I", "-c", HARNESS, encoded_source, encoded_stdin, timeout=7
        )
        stdout = process.stdout.read()
        process.wait()
        if process.returncode != 0:
            raise RuntimeError("sandbox harness failed")
        result = json.loads(stdout)
        if not isinstance(result, dict):
            raise RuntimeError("invalid sandbox result")
        return result
    finally:
        sandbox.terminate()


@app.function(
    image=api_image,
    timeout=140,
    secrets=[modal.Secret.from_name("pylearn-runner-auth")],
    region="ap-south",
    routing_region="ap-south",
)
@modal.fastapi_endpoint(method="POST", label="grade")
def grade(payload: dict[str, Any], request: Request) -> dict[str, Any]:
    expected_token = os.environ.get("RUNNER_TOKEN", "")
    supplied = request.headers.get("authorization", "")
    if not expected_token or not secrets.compare_digest(supplied, f"Bearer {expected_token}"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    if payload.get("language") != "python" or payload.get("version") != "3.12":
        raise HTTPException(status_code=400, detail="Unsupported runtime")
    files = payload.get("files")
    cases = payload.get("tests")
    if not isinstance(files, list) or len(files) != 1 or not isinstance(files[0], dict):
        raise HTTPException(status_code=400, detail="Invalid source")
    source = files[0].get("content")
    if not isinstance(source, str) or not source.strip() or len(source) > 20000:
        raise HTTPException(status_code=400, detail="Invalid source")
    if not isinstance(cases, list) or not 1 <= len(cases) <= 10:
        raise HTTPException(status_code=400, detail="Invalid test set")

    results = []
    for index, case in enumerate(cases):
        if not isinstance(case, dict) or case.get("id") != index or not isinstance(case.get("stdin"), str):
            raise HTTPException(status_code=400, detail="Invalid test case")
        if len(case["stdin"]) > 8192:
            raise HTTPException(status_code=400, detail="Test input is too large")
        try:
            results.append(_run_one(app, source, case["stdin"]))
        except Exception as exc:
            # Do not log student code or test values.
            raise HTTPException(status_code=503, detail="Sandbox could not run this submission") from exc
    return {"results": results}
