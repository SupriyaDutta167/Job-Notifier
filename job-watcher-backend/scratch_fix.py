import sys

def fix_file(file_path):
    with open(file_path, "r") as f:
        content = f.read()

    lines = content.split("\n")
    new_lines = []
    i = 0
    while i < len(lines):
        if lines[i].startswith('@patch("httpx.Client.get")'):
            i += 1
            if i < len(lines) and lines[i].startswith("def test_"):
                # Replace def test_name(mock_get): with def test_name(monkeypatch):
                func_line = lines[i].replace("(mock_get)", "(monkeypatch)")
                new_lines.append(func_line)
                new_lines.append("    mock_get = MagicMock()")
            else:
                new_lines.append(lines[i-1]) # fallback
                new_lines.append(lines[i])
        elif "result = adapter.discover_jobs(" in lines[i]:
            indent = lines[i][:lines[i].find("result")]
            new_lines.append(indent + 'monkeypatch.setattr(adapter.client, "get", mock_get)')
            new_lines.append(lines[i])
        else:
            new_lines.append(lines[i])
        i += 1
        
    with open(file_path, "w") as f:
        f.write("\n".join(new_lines))

fix_file("tests/unit/test_greenhouse.py")
fix_file("tests/unit/test_lever.py")
print("Fixed successfully")
