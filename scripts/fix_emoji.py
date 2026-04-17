import os

FILE_PATH = r"c:\Sher_AI_Studio\projects\FriendlyCode\src\UnifiedActivation.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the literal unicode string to actual emoji
# It was likely written as {"\U0001F381"} or similar
bad_text = '{"\\U0001F381"}'
good_text = '"🎁"'

if bad_text in content:
    new_content = content.replace(bad_text, good_text)
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully fixed emoji artifact.")
else:
    # Fallback if it was written differently
    import re
    new_content = re.sub(r'\{"\\[uU]0001[fF]381"\}', '"🎁"', content)
    if new_content != content:
        with open(FILE_PATH, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Successfully fixed emoji artifact using regex.")
    else:
        print("Artifact not found in file.")
