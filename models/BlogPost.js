import mongoose from 'mongoose';

const BlogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true, minlength: 300 },
  author: { type: String, default: 'Anonymous' },
  tags: [String],
  category: { type: String, default: 'General' },
  date: { type: String, required: true },
  readTime: { type: Number, required: true }
});

export default mongoose.model('BlogPost', BlogPostSchema);
