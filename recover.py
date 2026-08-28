import json
transcript_path = r'C:\Users\nguye\.gemini\antigravity\brain\34663e3b-ec3a-441c-9444-a9a2fe5385eb\.system_generated\logs\transcript_full.jsonl'
lines = []
for line in open(transcript_path, 'r', encoding='utf-8'):
    if 'update_row_fix.py' in line:
        try:
            data = json.loads(line)
            if 'content' in data and 'replacement =' in data['content']:
                text = data['content']
                if '```powershell' in text:
                    code = text.split('```powershell')[1].split('```')[0].strip()
                    if '$code = @\"' in code:
                        pycode = code.split('$code = @\"')[1].split('\"@')[0].strip()
                        with open('update_row_fix.py', 'w', encoding='utf-8') as f:
                            f.write(pycode)
                        print('Recovered update_row_fix.py!')
                        break
        except Exception as e:
            pass
