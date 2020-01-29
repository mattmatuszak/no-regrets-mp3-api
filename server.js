const fs = require('fs')

const express = require('express')
const multer = require('multer')

const ThreadQueue = require('./src/ThreadQueue')

const key = req => `${req.params.mediaItemId}-${req.params.kind}.mp3`
const MP3_STORAGE_LOCATION = '/tmp/no-regrets'

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
  console.log(`${req.params.mediaItemId}=${req.params.kind}`)
  const id = key(req)
  if (req.params.kind === 'original') {
    ThreadQueue.q.push({ id, task: new ThreadQueue.ConvertToMono({ inputMp3: `${MP3_STORAGE_LOCATION}/${id}` }) })
  }
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
  res.status(201).json({ success: true })
})

const extensionFilter = file => file.indexOf('.mp3') >= 0 || file.indexOf('.png') >= 0

const reduceDirectoryContents = (accum, fileName) => {
  const mediaId = fileName.substring(0, fileName.indexOf('-'))
  let mediaItem = accum.find(item => item.id === mediaId)
  if (!mediaItem) {
    mediaItem = { id: mediaId }
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

const port = 7002

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
