import os
import sys

date = sys.argv[1]
# make sure format is YYYY-MM-DD or YYYY-M-DD or YYYY-MM-D or YYYY-M-D
date_chunks = date.split('-')
year = date_chunks[0]
month = date_chunks[1]
day = date_chunks[2]
c1 = len(year) == 4
c2 = len(month) <= 2
c3 = len(day) <= 2
if not (c1 and c2 and c3):
    print("Invalid date format. Please use YYYY-MM-DD or YYYY-M-DD or YYYY-MM-D or YYYY-M-D")
    exit(1)
else:
    username = os.environ.get('USER_NAME')
    password = os.environ.get('PASSWORD')
    db_name = 'tempSwara'

    uri = f"mongodb+srv://{username}:{password}@swara.f5cuf.mongodb.net/{db_name}"
    command = f"mongorestore --uri {uri} backups/{date}/swara"


    os.system(command)


