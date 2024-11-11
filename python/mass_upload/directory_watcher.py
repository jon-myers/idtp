import time
import os
import shutil
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

MASS_UPLOADS_DIR = './mass_uploads'  # Use absolute path if necessary

class MyEventHandler(FileSystemEventHandler):
    def on_created(self, event):
        print(f"Created: {event.src_path}")
        self.check_for_blank_txt(event)

    def on_modified(self, event):
        print(f"Modified: {event.src_path}")
        self.check_for_blank_txt(event)

    def on_moved(self, event):
        print(f"Moved: from {event.src_path} to {event.dest_path}")
        self.check_for_blank_txt(event)

    def check_for_blank_txt(self, event):
        if event.is_directory:
            return

        # Check both source and destination paths
        paths_to_check = [event.src_path]
        if hasattr(event, 'dest_path'):
            paths_to_check.append(event.dest_path)

        for path in paths_to_check:
            file_name = os.path.basename(path)
            if file_name == 'blank.txt':
                dir_path = os.path.dirname(path)
                print(f"'blank.txt' detected in {dir_path}. Starting processing.")
                self.process_and_cleanup(dir_path)
                break  # Stop checking after processing

    def process_and_cleanup(self, dir_path):
        # Avoid processing the same directory multiple times
        if not os.path.exists(dir_path):
            return

        # Process the files in the directory
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                if file == 'blank.txt':
                    continue  # Skip the flag file
                file_path = os.path.join(root, file)
                # Replace this with your processing function
                print(f"Processing file {file_path}")
                os.system(f'python3 process_mass_uploaded_audio.py {file_path}')
                

        # After processing, delete the directory
        shutil.rmtree(dir_path)
        print(f"Deleted directory {dir_path}")

if __name__ == "__main__":
    # Ensure MASS_UPLOADS_DIR is an absolute path
    MASS_UPLOADS_DIR = os.path.abspath(MASS_UPLOADS_DIR)

    observer = Observer()
    event_handler = MyEventHandler()
    observer.schedule(event_handler, path=MASS_UPLOADS_DIR, recursive=True)
    observer.start()
    print(f"Watching for 'blank.txt' files in {MASS_UPLOADS_DIR}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
