"""Download data from a successful main-branch release; never execute archived code."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

repo = 'team-telnyx/knowledge-base'
run = os.environ['ROLLBACK_RUN_ID']
if not run.isdigit():
    raise ValueError('Rollback run ID must be numeric')
metadata = json.loads(subprocess.check_output(['gh', 'api', f'repos/{repo}/actions/runs/{run}']))
if metadata['head_branch'] != 'main' or metadata['conclusion'] != 'success' or metadata['path'] != '.github/workflows/deploy-website.yml':
    raise ValueError('Rollback requires a successful main deployment from this workflow')
with tempfile.TemporaryDirectory() as directory:
    subprocess.run(['gh', 'run', 'download', run, '--repo', repo, '--name', f'support-site-release-{run}', '--dir', directory], check=True)
    downloaded = Path(directory)
    success = json.loads((downloaded / 'release-report/success.json').read_text())
    if success['mode'] != 'release-verified':
        raise ValueError('Cannot roll back to an unverified/bootstrap release')
    # Only generated data is used. Scripts always come from the current approved main.
    for name in ['dist', 'dist-edge']:
        source = downloaded / name
        if not source.is_dir() or any(p.is_symlink() for p in source.rglob('*')):
            raise ValueError('Invalid release artifact')
        target = Path('website') / name
        shutil.rmtree(target, ignore_errors=True)
        shutil.copytree(source, target)
