import math
import random

def clamp(v, l=0, h=1):
    return min(max(l, v), h)

def get_drift(previous_drift, avg_drift=0.01, drift_dev=0.001, 
              spike_drift_dev=0.005, spike_rate=0.01, retrain_chance=0.001):
    if random.random() < retrain_chance:
        return avg_drift
    if random.random() <= spike_rate:
        new_drift = previous_drift + random.gauss(avg_drift, spike_drift_dev)
    else:
        new_drift = previous_drift + random.gauss(avg_drift, drift_dev)
    return clamp(new_drift)

def get_bias(drift, low=0.05, high=0.2, spike=0.4, spike_rate=0.01):
    base_bias = random.uniform(low, high)
    correlated_bias = base_bias + 0.5 * drift
    if random.random() <= spike_rate:
        return clamp(random.uniform(high, spike))
    return clamp(correlated_bias)

def get_accuracy(drift, bias, base=0.85, variation=0.02):
    # Higher drift and bias reduce accuracy
    reduction = 0.3*drift + 0.2*bias
    return clamp(base - reduction + random.uniform(-variation, variation))

def get_precision(accuracy, variation=0.03):
    return clamp(accuracy + random.uniform(-variation, variation))

def get_error_rate(accuracy, noise=0.01):
    return clamp(1 - accuracy + random.uniform(-noise, noise))

def get_risk(error_rate, bias, w_error=0.6, w_bias=0.4, interaction=0.5):
    risk = w_error * error_rate + w_bias * bias + interaction * (error_rate * bias)
    return clamp(risk)

def get_usage(hour=None, avg_calls=50, daily_amplitude=30):
    if hour is None:
        hour = random.randint(0, 23)
    pattern = avg_calls + daily_amplitude * math.sin((hour/24)*2*math.pi)
    return max(0, int(random.gauss(pattern, 5)))

def get_response_times(num_calls, base=150, jitter=20, spike_chance=0.05, spike_factor=(1.5,3.0)):
    times = []
    for _ in range(num_calls):
        rt = random.gauss(base, jitter)
        if random.random() < spike_chance:
            rt *= random.uniform(*spike_factor)
        times.append(max(0, rt))
    return times

def get_power_usage(num_calls, response_times, base_power=20, usage_factor=0.05, response_factor=0.1, noise=2):
    total_response_power = sum(response_factor * rt for rt in response_times)
    power = base_power + usage_factor * num_calls + total_response_power
    power += random.uniform(-noise, noise)
    return max(0, power)

def generate_metrics(previous_metrics=None, hour=None):
    metrics = {}
    prev_drift = previous_metrics['drift'] if previous_metrics else 0.0

    # Drift and bias
    metrics['drift'] = get_drift(prev_drift)
    metrics['bias'] = get_bias(metrics['drift'])

    # Accuracy, precision, error (interdependent)
    metrics['accuracy'] = get_accuracy(metrics['drift'], metrics['bias'])
    metrics['precision'] = get_precision(metrics['accuracy'])
    metrics['error_rate'] = get_error_rate(metrics['accuracy'])

    # Risk
    metrics['risk_percentage'] = get_risk(metrics['error_rate'], metrics['bias'])

    # Usage and response times
    metrics['api_usage'] = get_usage(hour)
    metrics['response_times'] = get_response_times(metrics['api_usage'])

    # Power
    metrics['power_usage'] = get_power_usage(metrics['api_usage'], metrics['response_times'])

    return metrics
