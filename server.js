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

app.get('/api/media', (req, res) => {
  res.json({ test: true })
})

const port = 7002

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
