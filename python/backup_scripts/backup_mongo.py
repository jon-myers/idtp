import os, datetime

date = datetime.datetime.now()
uri = "mongodb+srv://export_robot:S2Tx7T0TqKn3g2Li@swara.f5cuf.mongodb.net"
date_string = str(date.year) + '-' + str(date.month) + '-' + str(date.day)
out_path = "backups/" + date_string
command = "mongodump --uri " + uri + " -o " + out_path + " --forceTableScan"
os.system(command)