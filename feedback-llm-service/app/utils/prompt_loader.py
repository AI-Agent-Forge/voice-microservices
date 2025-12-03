import os


def load_prompt(name: str) -> str:
    path = os.path.join("prompts", name)
    with open(path, "r") as f:
        return f.read()

