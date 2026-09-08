import sys

def add_mock_get(file_path):
    with open(file_path, "r") as f:
        content = f.read()

    lines = content.split("\n")
    new_lines = []
    for i, line in enumerate(lines):
        new_lines.append(line)
        if line.startswith("def test_discover_jobs_") and "(monkeypatch)" in line:
            new_lines.append("    mock_get = MagicMock()")
            
    with open(file_path, "w") as f:
        f.write("\n".join(new_lines))

add_mock_get("tests/unit/test_greenhouse.py")
add_mock_get("tests/unit/test_lever.py")
print("Done")
