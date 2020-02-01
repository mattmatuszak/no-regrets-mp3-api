const fs = require('fs')

const express = require('express')
const multer = require('multer')

const ThreadQueue = require('./ThreadQueue')

const key = req => `${req.params.mediaItemId}-${req.params.kind}.mp3`
const MP3_STORAGE_LOCATION = process.env.MP3_STORAGE_LOCATION || '/tmp/no-regrets'

console.log(`MP3_STORAGE_LOCATION = ${MP3_STORAGE_LOCATION}`)

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, MP3_STORAGE_LOCATION)
  },
  filename: function (req, file, cb) {
    console.log(req.body.myName)
    cb(null, key(req))
  }
})

const upload = multer({ storage: storage })

const app = express()

app.post('/api/media/:mediaItemId/:kind', upload.single('file'), function (req, res) {
  console.log(`${req.params.mediaItemId}-${req.params.kind}`)
  const id = key(req)
  if (req.params.kind === 'original') {
    ThreadQueue.q.push({ id, task: new ThreadQueue.ConvertToMono({ inputMp3: `${MP3_STORAGE_LOCATION}/${id}` }) })
  } else {
    ThreadQueue.q.push({ id, task: new ThreadQueue.Spectrogram({ inputMp3: `${MP3_STORAGE_LOCATION}/${id}` }) })
    ThreadQueue.q.push({ id: `${id}-compand`, task: new ThreadQueue.Compand({ inputMp3: `${MP3_STORAGE_LOCATION}/${id}` }) })
  }
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
  res.status(201).json({ success: true })
})

app.put('/api/media/:mediaItemId', function (req, res) {
  console.log(`Updating status ${req.params.mediaItemId}`)
  ThreadQueue.q.push({ id: `${req.params.mediaItemId}-statusUpdate`, task: new ThreadQueue.UpdateStatus({ mp3Id: req.params.mediaItemId, status: 'Uploaded to Subsplash' }) })
  res.status(201).json({ status: 'Uploaded to Subsplash' })
})

const extensionFilter = file => file.indexOf('.mp3') >= 0 || file.indexOf('.png') >= 0

const reduceDirectoryContents = (accum, fileName) => {
  const mediaId = fileName.substring(0, fileName.indexOf('-'))
  let mediaItem = accum.find(item => item.id === mediaId)
  if (!mediaItem) {
    let status = 'NOT READY'
    if (fs.existsSync(`${MP3_STORAGE_LOCATION}/${mediaId}.txt`)) {
      status = fs.readFileSync(`${MP3_STORAGE_LOCATION}/${mediaId}.txt`, { encoding: 'utf8' })
      console.log(`reading ${MP3_STORAGE_LOCATION}/${fileName} ${status}`)
    }
    
    mediaItem = { id: mediaId, status }
    accum.push(mediaItem)
  }
  const kind = fileName.substring(fileName.indexOf('-') + 1, fileName.indexOf('.'))
  if (!mediaItem[kind]) {
    mediaItem[kind] = []
  }
  mediaItem[kind].push(fileName)
  return accum
}

app.get('/api/media', (req, res) => {
  const directoryContents = fs.readdirSync(MP3_STORAGE_LOCATION).filter(extensionFilter)
  const media = directoryContents.reduce(reduceDirectoryContents, [])
  res.json(media)
})

app.get('/api/media/content/:fileName', (req, res) => {
  const fileRef = `${MP3_STORAGE_LOCATION}/${req.params.fileName}`
  console.log(`getting file ${fileRef}`)
  if (!fs.existsSync(fileRef)) {
    res.status(404).end()
  } else {
    res.sendFile(fileRef)
  }
})

app.get('/api/media/:mediaItemId', (req, res) => {
  const directoryContents = fs.readdirSync(MP3_STORAGE_LOCATION)
    .filter(fileName => fileName.indexOf(req.params.mediaItemId) >= 0)
    .filter(extensionFilter)
  const media = directoryContents.reduce(reduceDirectoryContents, [])
  if (media.length === 0) {
    res.status(404).end()
  } else {
    res.json(media[0])
  }
})

const port = process.env.MEDIA_API_PORT || 7002

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
