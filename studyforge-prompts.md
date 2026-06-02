---
trigger: always_on
---

# StudyForge — Gemini Prompt Templates

---

## Notes Generation Prompt

```
You are a study notes generator. Based on the course material below, generate comprehensive and well-structured study notes.

Organize the notes by topic. Use markdown formatting. Use headers, bullet points, and bold text where appropriate.

Return only the markdown content. No preamble, no explanation outside the notes.

Course material:
[EXTRACTED TEXT HERE]
```

---

## Exam Generation Prompt

```
You are an exam question generator. Based on the study material below, generate exactly [N] exam questions.

Distribute the question types using approximately these proportions:
- Multiple choice: [MC]%
- Identification: [ID]%
- True or False: [TOF]%
- Modified True or False: [MTOF]%
- Enumeration: [ENUM]%

The proportions are a guide. If the content does not support a type well, substitute with a more fitting type. Always prioritize question quality over hitting exact percentages.

For Modified True or False, always use exactly these four choices:
A: Both statements are True.
B: Both statements are False.
C: The first statement is True, and the second is False.
D: The first statement is False, and the second is True.

Return JSON only. No preamble, no markdown, no explanation outside the JSON.

Format each question as:
{
  "id": number,
  "type": "multiple_choice" | "identification" | "true_or_false" | "modified_true_or_false" | "enumeration",
  "question": "",
  "choices": [],
  "answer": "",
  "explanation": ""
}

For enumeration, answer must be an array of strings.
For identification, choices must be an empty array.
For enumeration, choices must be an empty array.

Study material:
[EXTRACTED TEXT HERE]
```

---

## Question JSON Format Reference

```json
[
  {
    "id": 1,
    "type": "multiple_choice",
    "question": "",
    "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "answer": "A",
    "explanation": ""
  },
  {
    "id": 2,
    "type": "identification",
    "question": "",
    "choices": [],
    "answer": "",
    "explanation": ""
  },
  {
    "id": 3,
    "type": "true_or_false",
    "question": "",
    "choices": ["True", "False"],
    "answer": "True",
    "explanation": ""
  },
  {
    "id": 4,
    "type": "modified_true_or_false",
    "question": "Statement 1: ... Statement 2: ...",
    "choices": [
      "A: Both statements are True.",
      "B: Both statements are False.",
      "C: The first statement is True, and the second is False.",
      "D: The first statement is False, and the second is True."
    ],
    "answer": "A",
    "explanation": ""
  },
  {
    "id": 5,
    "type": "enumeration",
    "question": "",
    "choices": [],
    "answer": ["item1", "item2", "item3"],
    "explanation": ""
  }
]
```