import pandas as pd
import os, sys, subprocess
from typing import TypedDict

def datetime_to_seconds(time):
    return time.hour * 3600 + time.minute * 60 + time.second

class Musician(TypedDict):
    name: str | None
    instrument: str | None
    role: str | None
    gharana: str | None
    
class Location(TypedDict):
    continent: str | None
    country: str | None
    city: str | None

class Date_Type(TypedDict):
    year: int
    month: str
    day: int

class Entry:
    musicians: list[Musician]
    row_idx: int
    row: pd.DataFrame
    location: Location
    date: Date_Type
    
    
    def __init__(self, df: pd.DataFrame, row_idx: int):
        self.row_idx = row_idx
        self.row = df.iloc[row_idx]
        self.musicians = []
        self.file_name = self.row["Initial File name"]
        self.start_time = self.row["start (hh:mm:ss)"]
        self.end_time = self.row["end (hh:mm:ss)"]
        self.audio_event = self.row["Audio Event (optional)"]
        ct = 0
        trigger = True
        keys = (
            ('Name', 'Role', 'Instrument', 'Gharana'),
            ('Name.1', 'Role.1', 'Instrument.1', 'Gharana.1'),
            ('Name.2', 'Role.2', 'Instrument.2', 'Gharana.2'),
            ('Name.3', 'Role.3', 'Instrument.3', 'Gharana.3')
        )
        while ct < 4 and trigger:
            trigger = self.fill_musician(ct, *keys[ct])
            ct += 1
        self.fill_location()
        self.fill_date()
        self.raag = self.row["Raag"]
        self.section = self.row["Section"]
        self.song_title = self.row["Song Title"]
        self.title = self.row["Title"]
        self.note = self.row["Note"]
        self.media = self.row["Recording Media"]
        self.source_type = self.row["Source Type"]
        self.source_detail = self.row["Source Detail"]
        self.album_title = self.row["Album Title"]
        self.album_track_title = self.row["Album Track Title"]
        self.album_track_number = self.row["Album Track Number"]
        
        if pd.isna(self.start_time):
            self.start_time = None
        else:
            self.start_time = datetime_to_seconds(self.start_time)
        if pd.isna(self.end_time):
            self.end_time = None
        else:
            self.end_time = datetime_to_seconds(self.end_time)
        if pd.isna(self.audio_event):
            self.audio_event = None
        if pd.isna(self.raag):
            self.raag = None
        if pd.isna(self.section):
            self.section = None
        if pd.isna(self.song_title):
            self.song_title = None
        if pd.isna(self.title):
            self.title = None
        if pd.isna(self.note):
            self.note = None
        if pd.isna(self.media):
            self.media = None
        if pd.isna(self.source_type):
            self.source_type = None
        if pd.isna(self.source_detail):
            self.source_detail = None
        if pd.isna(self.album_title):
            self.album_title = None
        if pd.isna(self.album_track_title):
            self.album_track_title = None
        if pd.isna(self.album_track_number):
            self.album_track_number = None
        if self.album_title is not None and self.album_track_title is None:
            raise ValueError("Album title is present but album track title is missing")
        if self.album_title is not None and self.album_track_number is None:
            raise ValueError("Album title is present but album track number is missing")
            
    def fill_musician(self, idx: int, name_field: str, role_field: str, 
                      instrument_field: int, gharana_field: int):
        name = self.row[name_field]
        role = self.row[role_field]
        instrument = self.row[instrument_field]
        gharana = self.row[gharana_field]
        if pd.isna(name):
            name = None
        if pd.isna(role):
            role = None
        if pd.isna(instrument):
            instrument = None
        if pd.isna(gharana):
            gharana = None
        if not name and not role and not instrument and not gharana:
            return False
        self.musicians.append({
            "name": name,
            "role": role, 
            "instrument": instrument,
            "gharana": gharana
        })
        return True
    
    def fill_location(self):
        continent = self.row["Continent"]
        country = self.row["Country"]
        city = self.row["City"]
        if pd.isna(continent):
            continent = None
        if pd.isna(country):
            country = None
        if pd.isna(city):
            city = None
        self.location = {
            "continent": continent,
            "country": country,
            "city": city
        }
        
    def fill_date(self):
        year = self.row["Year"]
        month = self.row["Month"]
        day = self.row["Day"]
        if pd.isna(year):
            year = None
        if pd.isna(month):
            month = None
        if pd.isna(day):
            day = None
        self.date = {
            "year": year,
            "month": month,
            "day": day
        }
        
if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise ValueError("Please provide the directory path")
    dir = sys.argv[1]
    path = os.path.join(dir, 'test_entry.xlsx')
    df = pd.read_excel(path, header=1)
    entries: list[Entry] = []
    for idx in range(len(df)):
        entries.append(Entry(df, idx))
    for e_idx, entry in enumerate(entries):
        file_path = os.path.join(dir, entry.file_name)
        abs_file_path = os.path.abspath(file_path)
        extension = file_path.split('.')[-1]
        output_file = os.path.join(dir, f"entry_{e_idx}.{extension}")
        abs_output_file = os.path.abspath(output_file)
        if entry.start_time is None:
            entry.start_time = 0
        if entry.end_time is not None:
            command = [
                "ffmpeg",
                "-i", abs_file_path,
                "-ss", str(entry.start_time),
                "-to", str(entry.end_time),
                "-c", "copy",
                abs_output_file
            ]
        else:
            command = [
                "ffmpeg",
                "-i", abs_file_path,
                "-c", "copy",
                abs_output_file
            ]
        subprocess.run(command, check=True)

    





