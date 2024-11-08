import pandas as pd
import os, sys, subprocess
from typing import TypedDict
from bson import ObjectId
from mutagen import File
from datetime import datetime
from pprint import pprint


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
    
class Audio_Event:
    _id: ObjectId
    name: str
    userID: str = "634d9506a6a3647e543b7641"
    rec_entries: list["Entry"]
    
    def __init__(self, name: str):
        self.name = name
        self._id = ObjectId()
        self.rec_entries = []
    
    def add_recording(self, entry: "Entry"):
        self.rec_entries.append(entry)
        self.rec_entries.sort(key=lambda x: x.ae_track_num)
        
    def get_mongo_json(self):
        json_obj = {
            "_id": self._id,
            "name": self.name,
            "userID": self.userID,
            "permissions": "Public",
            "collections": [],
            "explicitPermissions": {
                "edit": [],
                "view": [],
                "publicView": True
            },
            "recordings": {}
        }
        for i, rec in enumerate(self.rec_entries):
            json_obj["recordings"][str(i)] = rec.get_ae_mongo_json()
        return json_obj
        
    

class Entry:
    musicians: list[Musician]
    row_idx: int
    row: pd.DataFrame
    location: Location
    date: Date_Type
    _id: ObjectId
    userID: str = "634d9506a6a3647e543b7641"
    parentID: ObjectId | None = None
    album_track_number: int | None
    ae_track_num: int | None
    duration: float
    dir: str
    oct_offset: int
    
    def __init__(self, df: pd.DataFrame, row_idx: int, dir: str):
        self.row_idx = row_idx
        self.row = df.iloc[row_idx]
        self.musicians = []
        self.file_name = self.row["Initial File name"]
        self.start_time = self.row["start (hh:mm:ss)"]
        self.end_time = self.row["end (hh:mm:ss)"]
        self.audio_event = self.row["Audio Event (optional)"]
        self.ae_track_num = self.row["Track # (necessary if Audio Event)"]
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
        self.dir = dir
        
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
        if pd.isna(self.ae_track_num):
            self.ae_track_num = None
        if self.album_title is not None and self.album_track_title is None:
            raise ValueError("Album title is present but album track title is missing")
        if self.album_title is not None and self.album_track_number is None:
            raise ValueError("Album title is present but album track number is missing")
        self._id = ObjectId()
        if self.audio_event is not None:
            if self.ae_track_num is None:
                raise ValueError("Audio event is present but track number is missing")
        
        if self.start_time is None and self.end_time is None:
            self.duration = self.get_duration()
        else:
            self.duration = self.end_time - self.start_time
        m0 = self.musicians[0]
        if m0['role'] == 'Soloist' and m0['instrument'] == 'Vocal (M)':
            self.oct_offset = -1
        else:
            self.oct_offset = 0
            
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
    
    def get_duration(self):
        file_path = os.path.join(self.dir, self.file_name)
        audio = File(file_path)
        if audio is not None and audio.info is not None:
            return audio.info.length
        else:
            raise ValueError("Could not get audio file")
        
    def get_ae_mongo_json(self):
        # for adding to the audio_event class instance containing recoridng, if
        # applicable, for eventually saving in the audioEvent collection.
        mongo_json = self.get_mongo_json()
        ae_mongo_json = {}
        ae_mongo_json["audioFileId"] = mongo_json["_id"]
        ae_mongo_json["duration"] = mongo_json["duration"]
        ae_mongo_json["date"] = mongo_json["date"]
        ae_mongo_json["location"] = mongo_json["location"]
        ae_mongo_json["musicians"] = mongo_json["musicians"]
        ae_mongo_json["raags"] = mongo_json["raags"]
        ae_mongo_json["octOffset"] = mongo_json["octOffset"]
        ae_mongo_json["dateModified"] = mongo_json["dateModified"]
        ae_mongo_json["explicityPermissions"] = mongo_json["explicitPermissions"]
        ae_mongo_json["userID"] = mongo_json["userID"]
        ae_mongo_json["media"] = self.media
        return ae_mongo_json
        
    def get_mongo_json(self):
        # for saving in the audioRecording collection
        date_obj = {}
        if self.date["year"]:
            date_obj["year"] = str(self.date["year"])
        if self.date["month"]:
            date_obj["month"] = self.date["month"]
        if self.date["day"]:
            date_obj["day"] = str(self.date["day"])
            
        location_obj = {}
        if self.location["continent"]:
            location_obj["continent"] = self.location["continent"]
        if self.location["country"]:
            location_obj["country"] = self.location["country"]
        if self.location["city"]:
            location_obj["city"] = self.location["city"]
            
        musicians_obj = {}
        unknown_ct = 0
        for musician in self.musicians:
            m_obj = {}
            if musician['role']:
                m_obj['role'] = musician['role']
            if musician['instrument']:
                m_obj['instrument'] = musician['instrument']
            if musician['gharana']:
                m_obj['gharana'] = musician['gharana']
            if musician['name'] is None:
                musicians_obj[f"unknown_{unknown_ct}"] = m_obj
                unknown_ct += 1
            else:
                musicians_obj[musician['name']] = m_obj
                
        raags_obj = {}
        if self.raag is not None:
            raags_obj[self.raag] = {
                "start": 0,
                "end": 0,
            }
            p_sec = {}
            if self.section is not None:
                p_sec[self.section] = {
                    "start": 0,
                    "end": 0,
                }
            else: 
                p_sec["undefined"] = {
                    "start": 0,
                    "end": 0,
                }
            raags_obj[self.raag]["performance sections"] = p_sec
        
        output_obj = {
            "date": date_obj,
            "location": location_obj,
            "musicians": musicians_obj,
            "raags": raags_obj,
            "_id": self._id,
            "dateModified": datetime.now(),
            "duration": self.duration,
            "collections": [],
            "explicitPermissions": {
                "edit": [],
                "view": [],
                "publicView": True
            },
            "octOffset": self.oct_offset,
            "userID": self.userID,
            "media": self.media,
        }
        if self.parentID is not None:
            output_obj["parentID"] = self.parentID
            output_obj["parentTitle"] = self.audio_event
            output_obj["aeUserID"] = "634d9506a6a3647e543b7641"
            output_obj["parentTrackNumber"] = str(self.ae_track_num - 1)
        else:
            output_obj["parentID"] = None
            output_obj["parentTitle"] = None
            output_obj["aeUserID"] = None
            output_obj["parentTrackNumber"] = None
        return output_obj
        
if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise ValueError("Please provide the directory path")
    dir = sys.argv[1]
    path = os.path.join(dir, 'test_entry.xlsx')
    df = pd.read_excel(path, header=1)
    entries: list[Entry] = []
    # before gathering entries, need to go thorugh all and get list of audio 
    # events. This is because when we later call `get_mongo_json` on audio 
    # events, we need, if there _is_ an associated "audio event", to get its 
    # object id.
    audio_event_names = []
    audio_events: list[Audio_Event] = []
    for idx in range(len(df)):
        row = df.iloc[idx]
        audio_event_name = row["Audio Event (optional)"]
        if not pd.isna(audio_event_name):
            if audio_event_name not in audio_event_names:
                audio_event_names.append(audio_event_name)
    for ae in audio_event_names:
        audio_events.append(Audio_Event(ae))
    for idx in range(len(df)):
        e = Entry(df, idx, dir)
        if e.audio_event is not None:
            ae = next((x for x in audio_events if x.name == e.audio_event), None)
            e.parentID = audio_events[audio_event_names.index(e.audio_event)]._id
            # ae.rec_entries.append(e)
            ae.add_recording(e)
        entries.append(e)
    breakpoint()
    for e_idx, entry in enumerate(entries):
        pprint(entry.get_mongo_json())
        # breakpoint()
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
