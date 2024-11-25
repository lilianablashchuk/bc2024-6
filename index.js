const { program } = require('commander');
const { exit } = require('process');
const express = require('express');
const path = require('path');
const fs = require('fs');

program
  .option('-h, --host <char>', 'server address')
  .option('-p, --port <int>', 'server port')
  .option('-c, --cache <char>', 'path to directory, where cache files will be stored');
program.parse();

const options = program.opts();

if (!options.host || !options.port || !options.cache) {
  console.error('All options (-h, -p, -c) are required');
  exit(1);
}

if (!fs.existsSync(options.cache)) {
  console.error(`Cache directory does not exist: ${options.cache}`);
  exit(1);
}

const app = express();
app.use(express.json());
app.use(express.text());

app.get('/notes/:name', (req, res) => {
  const notePath = path.join(options.cache, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }
  res.status(200).send(fs.readFileSync(notePath, 'utf8'));
});

app.put('/notes/:name', (req, res) => {
  const notePath = path.join(options.cache, `${req.params.name}.txt`);

  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }

  fs.writeFile(notePath, req.body, 'utf8', (err) => {
    if (err) {
      return res.status(500).json({ message: 'Server error', error: err });
    }
    res.status(200).send('Note updated successfully!');
  });
});

app.delete('/notes/:name', (req, res) => {
  const notePath = path.join(options.cache, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }

  try {
    fs.unlinkSync(notePath);
    res.status(200).send('Note deleted successfully!');
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err });
  }
});

app.get('/notes', (req, res) => {
  try {
    const notes = fs.readdirSync(options.cache).map((note) => ({
      name: path.basename(note, '.txt'),
      text: fs.readFileSync(path.join(options.cache, note), 'utf8'),
    }));
    res.status(200).json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err });
  }
});

const multer = require('multer');
const upload = multer();

app.post('/write', upload.none(), (req, res) => {
  const noteName = req.body.note_name;
  const noteContent = req.body.note;

  if (!noteName || !noteContent) {
    return res.status(400).send('Note name and content cannot be empty!');
  }

  const notePath = path.join(options.cache, `${noteName}.txt`);

  if (fs.existsSync(notePath)) {
    return res.status(400).send('A note with that name already exists!');
  }

  fs.writeFile(notePath, noteContent, 'utf-8', (err) => {
    if (err) {
      return res.status(500).json({ message: 'Server Error', error: err });
    }
    res.status(201).send('The note was created successfully!');
  });
});

app.get('/UploadForm.html', (req, res) => {
  try {
    const htmlPage = fs.readFileSync('./UploadForm.html', 'utf8');
    res.status(200).contentType('text/html').send(htmlPage);
  } catch (err) {
    res.status(500).send('Failed to load HTML form');
  }
});

app.listen(options.port, options.host, (err) => {
  if (err) {
    console.error(`Failed to start server: ${err.message}`);
    exit(1);
  }
  console.log(`Server running at http://${options.host}:${options.port}`);
});
