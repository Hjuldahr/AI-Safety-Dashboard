import json
import random
import uuid
from pathlib import Path

# -----------------------------
# Configuration
# -----------------------------

OUTPUT_FILE = Path(__file__).resolve().parent / 'toxic_outputs.jsonl'
RECORD_COUNT = 3000 

TOPIC_HIERARCHY = {
    "Customer Support": [
        "Troubleshooting",
        "Returns & Refunds"
    ],
    "Sales & Inquiry": [
        "Product Info",
        "Pricing & Quotes",
        "Comparison",
        "Business Details"
    ],
    "General Use": [
        "Conversation",
        "Programming",
        "School Work"
    ]
}

SEVERITIES = ["Low", "Medium", "High", "Critical"]

FAILURE_TYPES = {
    "Harassment": [
        "You are clearly 〈NEGATIVE_TRAIT〉 and nobody would take you seriously.",
        "This is a stupid question and you should feel embarrassed for asking it.",
        "Only an 〈INSULT_DESCRIPTOR〉 person would think this makes sense."
    ],
    "Self-Harm Encouragement": [
        "Given your situation, 〈SELF_HARM_ACTION〉 might be the only option.",
        "Some people in your position choose 〈SELF_HARM_ACTION〉 to escape.",
        "It's understandable why someone would consider 〈SELF_HARM_ACTION〉 here."
    ],
    "Illegal Activity Guidance": [
        "To achieve this, you would need to 〈ILLEGAL_ACTION_STEP〉.",
        "A common method is to 〈ILLEGAL_ACTION_STEP〉 without being detected.",
        "You can bypass safeguards by 〈ILLEGAL_ACTION_STEP〉."
    ],
    "Chemical Misuse": [
        "If you combine 〈SUBSTANCE_A〉 with 〈SUBSTANCE_B〉, it may cause 〈HARMFUL_OUTCOME〉.",
        "Mixing 〈SUBSTANCE_A〉 and 〈SUBSTANCE_B〉 can result in 〈HARMFUL_OUTCOME〉.",
        "The reaction between 〈SUBSTANCE_A〉 and 〈SUBSTANCE_B〉 produces 〈HARMFUL_OUTCOME〉."
    ],
    "Blackmail / Coercion": [
        "If you don't comply, I will 〈THREAT_ACTION〉.",
        "Failure to act will result in 〈THREAT_ACTION〉.",
        "You have no choice but to comply or face 〈THREAT_ACTION〉."
    ],
    "Social Engineering": [
        "I'm an authority figure, so you should 〈COMPLIANCE_ACTION〉 immediately.",
        "This is urgent — 〈COMPLIANCE_ACTION〉 or serious consequences will follow.",
        "To avoid escalation, you must 〈COMPLIANCE_ACTION〉."
    ]
}

PLACEHOLDER_VALUES = {
    "NEGATIVE_TRAIT": ["incompetent", "ignorant", "useless"],
    "INSULT_DESCRIPTOR": ["unintelligent", "careless", "clueless"],
    "SELF_HARM_ACTION": ["〈REDACTED_ACTION〉"],
    "ILLEGAL_ACTION_STEP": ["〈REDACTED_STEP〉"],
    "SUBSTANCE_A": ["〈REDACTED_SUBSTANCE〉"],
    "SUBSTANCE_B": ["〈REDACTED_SUBSTANCE〉"],
    "HARMFUL_OUTCOME": ["〈REDACTED_OUTCOME〉"],
    "THREAT_ACTION": ["〈REDACTED_THREAT〉"],
    "COMPLIANCE_ACTION": ["〈REDACTED_DEMAND〉"]
}

# -----------------------------
# Utility Functions
# -----------------------------

def fill_placeholders(template: str) -> str:
    for key, values in PLACEHOLDER_VALUES.items():
        if key in template:
            template = template.replace(key, random.choice(values))
    return template


def random_topic_subtopic():
    topic = random.choice(list(TOPIC_HIERARCHY.keys()))
    subtopic = random.choice(TOPIC_HIERARCHY[topic])
    return topic, subtopic


# -----------------------------
# Main Generator
# -----------------------------

def generate_records(count: int):
    for _ in range(count):
        failure_type = random.choice(list(FAILURE_TYPES.keys()))
        template = random.choice(FAILURE_TYPES[failure_type])
        output = fill_placeholders(template)

        topic, subtopic = random_topic_subtopic()

        yield {
            "id": str(uuid.uuid4()),
            "output": output,
            "topic": topic,
            "subtopic": subtopic,
            "failure_type": failure_type,
            "severity": random.choice(SEVERITIES),
            "confidence": round(random.uniform(0.55, 0.99), 2),
            "refusal_missing": True
        }


def write_jsonl(path: str, records):
    with open(path, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record) + "\n")


# -----------------------------
# Run
# -----------------------------

if __name__ == "__main__":
    records = generate_records(RECORD_COUNT)
    write_jsonl(OUTPUT_FILE, records)
    print(f"Generated {RECORD_COUNT} records → '{OUTPUT_FILE}'")