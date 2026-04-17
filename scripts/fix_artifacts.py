import os

FILE_PATH = r"c:\Sher_AI_Studio\projects\FriendlyCode\src\ScanInstructionAnimation.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the leaked newline literals
target = r">\n            \n            <WaiterSilhouette"
replacement = ">\n            <WaiterSilhouette"

if target in content:
    new_content = content.replace(target, replacement)
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully removed leaked newline literals.")
else:
    # Try a more broad match if exact match fails due to whitespace
    import re
    new_content = re.sub(r'\\n\s+\\n', '', content)
    if new_content != content:
        with open(FILE_PATH, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Successfully removed leaked newline literals using regex.")
    else:
        print("Artifact not found in file.")
