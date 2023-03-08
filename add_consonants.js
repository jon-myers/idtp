 const consonants = [
  {
    "type": "consonant",
    "ipa": "k",
    "iso_15919": "ka",
    "hindi": "क",
    "example": "kite"
  },
  {
    "type": "consonant",
    "ipa": "kʰ",
    "iso_15919": "kha",
    "hindi": "ख",
    "example": "khaki"
  },
  {
    "type": "consonant",
    "ipa": "g",
    "iso_15919": "ga",
    "hindi": "ग",
    "example": "goat"
  },
  {
    "type": "consonant",
    "ipa": "gʱ",
    "iso_15919": "gha",
    "hindi": "घ",
    "example": "ghost"
  },
  {
    "type": "consonant",
    "ipa": "ŋ",
    "iso_15919": "ṅa",
    "hindi": "ङ",
    "example": "sing"
  },
  {
    "type": "consonant",
    "ipa": "c",
    "iso_15919": "ca",
    "hindi": "च",
    "example": "church"
  },
  {
    "type": "consonant",
    "ipa": "cʰ",
    "iso_15919": "cha",
    "hindi": "छ",
    "example": "chat"
  },
  {
    "type": "consonant",
    "ipa": "ɟ",
    "iso_15919": "ja",
    "hindi": "ज",
    "example": "jump"
  },
  {
    "type": "consonant",
    "ipa": "ɟʱ",
    "iso_15919": "jha",
    "hindi": "झ",
    "example": "jhatka"
  },
  {
    "type": "consonant",
    "ipa": "ɲ",
    "iso_15919": "ña",
    "hindi": "ञ",
    "example": "canyon"
  },
  {
    "type": "consonant",
    "ipa": "ʈ",
    "iso_15919": "ṭa",
    "hindi": "ट",
    "example": "top"
  },
  {
    "type": "consonant",
    "ipa": "ʈʰ",
    "iso_15919": "ṭha",
    "hindi": "ठ",
    "example": "that"
  },
  {
    "type": "consonant",
    "ipa": "ɖ",
    "iso_15919": "ḍa",
    "hindi": "ड",
    "example": "dog"
  },
  {
    "type": "consonant",
    "ipa": "ɖʱ",
    "iso_15919": "ḍha",
    "hindi": "ढ",
    "example": "dharma"
  },
  {
    "type": "consonant",
    "ipa": "n",
    "iso_15919": "na",
    "hindi": "न",
    "example": "no",
  },
  {
    "type": "consonant",
    "ipa": "t",
    "iso_15919": "ta",
    "hindi": "त",
    "example": "top"
  },
  {
    "type": "consonant",
    "ipa": "tʰ",
    "iso_15919": "tha",
    "hindi": "थ",
    "example": "thump"
  },
  {
    "type": "consonant",
    "ipa": "d",
    "iso_15919": "da",
    "hindi": "द",
    "example": "dog"
  },
  {
    "type": "consonant",
    "ipa": "dʱ",
    "iso_15919": "dha",
    "hindi": "ध",
    "example": "dharma"
  },
  {
    "type": "consonant",
    "ipa": "n̪",
    "iso_15919": "na",
    "hindi": "न",
    "example": "no"
  },
  {
    "type": "consonant",
    "ipa": "p",
    "iso_15919": "pa",
    "hindi": "प",
    "example": "pot"
  },
  {
    "type": "consonant",
    "ipa": "pʰ",
    "iso_15919": "pha",
    "hindi": "फ़",
    "example": "potato"
  },
  {
    "type": "consonant",
    "ipa": "b",
    "iso_15919": "ba",
    "hindi": "ब",
    "example": "boat"
  },
  {
    "type": "consonant",
    "ipa": "bʱ",
    "iso_15919": "bha",
    "hindi": "भ",
    "example": "bhakti"
  },
  {
    "type": "consonant",
    "ipa": "m",
    "iso_15919": "ma",
    "hindi": "म",
    "example": "man"
  },
  {
    "type": "consonant",
    "ipa": "j",
    "iso_15919": "ya",
    "hindi": "य",
    "example": "yes"
  },
  {
    "type": "consonant",
    "ipa": "r",
    "iso_15919": "ra",
    "hindi": "र",
    "example": "red"
  },
  {
    "type": "consonant",
    "ipa": "l",
    "iso_15919": "la",
    "hindi": "ल",
    "example": "let"
  },
  {
    "type": "consonant",
    "ipa": "v",
    "iso_15919": "va",
    "hindi": "व",
    "example": "victory"
  },
  {
    "type": "consonant",
    "ipa": "ʃ",
    "iso_15919": "śa",
    "hindi": "श",
    "example": "ship"
  },
  {
    "type": "consonant",
    "ipa": "ʂ",
    "iso_15919": "ṣa",
    "hindi": "ष",
    "example": "share"
  },
  {
    "type": "consonant",
    "ipa": "s",
    "iso_15919": "sa",
    "hindi": "स",
    "example": "sit"
  },
  {
    "type": "consonant",
    "ipa": "h",
    "iso_15919": "ha",
    "hindi": "ह",
    "example": "hat"
  }
]

// add to mongodb document called "phonemes"
const { MongoClient, ObjectId } = require('mongodb');
const settings = 'retryWrites=true&w=majority';
const webAddress = 'swara.f5cuf.mongodb.net/swara';
const password = process.env.PASSWORD;
const username = process.env.USER_NAME;
const login = `srv://${username}:${password}`;
const uri = `mongodb+${login}@${webAddress}?${settings}`;

const upload = async () => {
  const client = await MongoClient.connect(uri, { useUnifiedTopology: true });    
  const db = client.db('swara');
  const phonemes = db.collection('phonemes');

  try {
    // const result = await phonemes.insertMany(consonants);
    const result = await phonemes.aggregate([
      {$group: {_id: {item: "$item", qty: "$qty", size: "$size", status: "$status"}}},
      {$project: {_id: 0, item: "$_id.item", qty: "$_id.qty", size: "$_id.size", status: "$_id.status"}},
      {$out: "phonemes"}
   ])
   console.log(result)


    // close connection
    // client.close();
  }
  catch (err) {
    console.log(err);
  }
  finally {
    client.close();
  }
};

upload();