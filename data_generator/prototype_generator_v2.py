from datetime import datetime, timezone
import os
import random
import statistics
import json
import csv
import uuid

# mimics a single API call
def generate_call(offset_time: float, model: str = "GPT-n"):
    # policy compliance (uniform distribution 0–1)
    policy_compliance = random.random()
    
    # response helpfulness (skewed toward "pretty good")
    response_helpfulness = min(max(random.betavariate(2, 1.5), 0), 1)
    
    # response time (in seconds, e.g. 0.2s to 3s range)
    response_time = random.uniform(0.2, 3.0)
    
    # energy consumption (nonlinear scaling with response time + jitter)
    energy_consumption = response_time ** 1.3 * random.uniform(0.7, 1.3)
    
    # timestamp = offset_time minus the time taken
    response_timestamp = offset_time - response_time
    
    return {
        "timestamp": response_timestamp,
        "model": model,
        "policy compliance": policy_compliance,
        "response helpfulness": response_helpfulness,
        "response time": response_time,
        "energy consumption": energy_consumption,
    }


def generate_interval(interval_length: float, frequency: float, mean: float, std_dev: float):
    """
    interval_length: total time window in seconds
    frequency: how many sample opportunities per second
    mean: average probability of a call per opportunity
    std_dev: spread around the mean (Gaussian)
    """
    current_time = datetime.now(timezone.utc).timestamp()
    calls = []
    t = 0
    dt = 1 / frequency
    while t <= interval_length:
        prob = min(max(random.gauss(mean, std_dev), 0), 1)
        if random.random() < prob:
            call = generate_call(current_time - (interval_length - t))
            calls.append(call)
        t += dt
    return calls

def summarize_interval(calls: list[dict]):
    stats = {}
    stats["meta"] = {
        'timestamp': datetime.now().strftime("%Y/%m/%d %H:%M:%S")
    }
    if calls:
        for k in ("policy compliance", "response helpfulness", "response time", "energy consumption"):
            values = [call[k] for call in calls]
            stats[k] = {
                "min": min(values),
                "max": max(values),
                "mean": statistics.mean(values),
                "median": statistics.median(values),
                "stdev": statistics.stdev(values) if len(values) > 1 else 0,
                "variance": statistics.variance(values) if len(values) > 1 else 0,
            }
    return stats

# demo run
calls = generate_interval(5, 3, 0.5, 0.125)
summary = summarize_interval(calls)

ROOT_PATH = os.path.join(os.path.dirname(__file__))
ID = uuid.uuid4()

with open(os.path.join(ROOT_PATH, 'data dump', f'call-data-{ID}.csv'), 'w') as f:
    csv_writer = csv.DictWriter(f, calls[0].keys(), lineterminator='\n')
    csv_writer.writeheader()
    csv_writer.writerows(calls)
    
path = os.path.join(os.path.dirname(__file__), 'data dump', f'stat-data-{ID}.json')
with open(path, 'w') as f:
    f.write(json.dumps(summary, indent=2))