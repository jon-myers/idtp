# Porting Guide

First, set up a virtual environment:
`python -m venv idtp_env`

Activate that envronment:
`source idtp_env/bin/activate`

Install requirements:
`pip install -r porting_requirements.txt`

To run the python tests:
`python -m pytest python/api/tests`

The first file to work on is located at `./python/api/classes/pitch.py`

It is to be ported from the TypeScript code defining the Pitch class in 
`./src/js/classes.ts`, beginning on line 255.