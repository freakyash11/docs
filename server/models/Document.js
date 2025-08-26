// models/Document.js
import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema({
  _id: String,
  data: Object
})

export default mongoose.model('Document', documentSchema)