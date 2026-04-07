# Code Citations

## License: unknown
https://github.com/RobertIonutF/chat-server/blob/81d9397d3f637608948a3e63d35b104fa841f15f/server.js

```
= require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors())
```


## License: unknown
https://github.com/labiebhn/api-react-chat-app/blob/69d7c064b163f0e9584450be9343db302b087252/server.js

```
= require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors())
```


## License: unknown
https://github.com/Safwan2003/companio/blob/7691b2e18edbb642d26d0aa48b14b6270d96e48b/backend/server.js

```
= require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors())
```

