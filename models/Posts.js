const mongoose = require('mongoose');

const Post = new mongoose.Schema({
    title: {
        type:String,
        require:true,
    },
    PostText: {
        type:String,
        require:true,
    },
    username: {
        type:String,
        require:true,
    }
}, {timestamps : true});

module.exports = mongoose.model('Post', Post);