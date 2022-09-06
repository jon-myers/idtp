import pymongo
from pymongo import MongoClient
from pymongo.server_api import ServerApi

query = "mongodb+srv://jon_myers:tabular0sa@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority"
client = pymongo.MongoClient(query, server_api=ServerApi('1'))
db = client.swara
ragas = db.ragas

rules = {
    'Yaman': {
        'sa': True,
        're': {
            'lowered': False,
            'raised': True
        },
        'ga': {
            'lowered': False,
            'raised': True
        },
        'ma': {
            'lowered': False,
            'raised': True
        },
        'pa': True,
        'dha': {
            'lowered': False,
            'raised': True
        },
        'ni': {
            'lowered': False,
            'raised': True
        }
    },
    'Malkauns': {
        'sa': True,
        're': {
            'lowered': False,
            'raised': False
        },
        'ga': {
            'lowered': True,
            'raised': False
        },
        'ma': {
            'lowered': True,
            'raised': False
        },
        'pa': False,
        'dha': {
            'lowered': True,
            'raised': False
        },
        'ni': {
            'lowered': True,
            'raised': False
        }
    },
    'Bageshri': {
        'sa': True,
        're': {
            'lowered': False,
            'raised': True
        },
        'ga': {
            'lowered': True,
            'raised': False
        },
        'ma': {
            'lowered': True,
            'raised': False
        },
        'pa': True,
        'dha': {
            'lowered': False,
            'raised': True
        },
        'ni': {
            'lowered': True,
            'raised': True
        }
    },
}

for key in rules.keys():
    query = { 'name': key }
    update = { '$set': { 'rules': rules[key] } }
    res = ragas.update_one(query, update)
    print(res)


# print(rules)
