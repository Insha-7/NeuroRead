import time
from rate_limit_monitor import rate_limit_monitor

print("1. Initial Status for llama-3.1-8b-instant:")
print(rate_limit_monitor.get_status("llama-3.1-8b-instant"))

print("\n2. Simulating 10 requests...")
for _ in range(10):
    rate_limit_monitor.record_request("llama-3.1-8b-instant")

print("\n3. Status after 10 requests:")
print(rate_limit_monitor.get_status("llama-3.1-8b-instant"))

print("\n4. Simulating a 429 Rate Limit hit (forces a 60s timeout)...")
rate_limit_monitor.mark_rate_limited("llama-3.1-8b-instant", reset_time_seconds=60)

print("\n5. Can we use the model right now?")
can_use = rate_limit_monitor.check_can_use_model("llama-3.1-8b-instant")
print(f"Check result: {can_use}")

print(f"\n6. How long do we have to wait?")
wait = rate_limit_monitor.get_wait_time("llama-3.1-8b-instant")
print(f"Wait time: {wait:.1f} seconds")

# Clean up our fake changes
import os
if os.path.exists("rate_limit_state.json"):
    os.remove("rate_limit_state.json")
