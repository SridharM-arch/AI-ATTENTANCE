const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://sridhar:sridhar143143@cluster0.tqkwn1k.mongodb.net/?appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB Atlas');
  mongoose.connection.close();
}).catch(err => {
  console.error('Connection failed:', err);
});