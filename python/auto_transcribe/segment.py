import essentia.standard as ess
import os
import numpy as np
import matplotlib.pyplot as plt

import requests
def get_melograph_json(rec_id: str):
    url = f"https://swara.studio/melographs/{rec_id}/melograph.json"
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for HTTP errors
        return response.json()
    except requests.exceptions.RequestException as err:
        print(f"Error fetching data: {err}")
        return None

rec_id = "62fa903990b9ba8cdae9d251"
# breakpoint()
melograph_data = get_melograph_json(rec_id)
data_chunks_list = melograph_data['data_chunks']
time_chunks_starts = melograph_data['time_chunk_starts']
time_chunks_list = []
increment = melograph_data['time_increment']
for s_idx, start in enumerate(time_chunks_starts):
    data_chunk = data_chunks_list[s_idx]
    time_chunk = [start + i * increment for i, _ in enumerate(data_chunk)]
    time_chunks_list.append(time_chunk)
# filter to only include segments between 13:30 and 13:50
filtered_start_idxs = [i for i, start in enumerate(time_chunks_starts) if start >= 810 and start <= 830]
data_chunks_list = [data_chunks_list[i] for i in filtered_start_idxs]
time_chunks_list = [time_chunks_list[i] for i in filtered_start_idxs]



# plotting
# plt.figure(figsize=(10, 6))
# for time_chunk, data_chunk in zip(time_chunks_list, data_chunks_list):
#     plt.semilogy(time_chunk, data_chunk)

# plt.xlabel('Time (s)')
# plt.ylabel('Frequency (Hz)')
# plt.title('Pitch Chunks on Log-Scaled Plot')
# plt.grid(True, which='both', linestyle='--', linewidth=0.5)
# plt.show()
