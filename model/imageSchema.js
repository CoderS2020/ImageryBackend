const mongoose=require('mongoose');


const imageSchema=new mongoose.Schema({
    author:{
        type:String,
        required:true
    },
    title:{
        type:String
    },
    description:{
        type:String
    },
    destination:{
        type:String
    },
    tags:{
        type:String
    },
    pin_sizes:{
        type:String
    },
    url:{
        type:String
    },
    timeofUpload:{
        type:String
    },
    idUploader:{
        type:String
    },
    likes:[
        {
           
        }
    ],
    download:[
        {
           
        }
    ],
    share:[
        {
           
        }
    ],
    view:[
        {

        }
    ],
    email:{
        type:String,
        required:true

    }
 
});




const Image=mongoose.model('IMAGE',imageSchema);

module.exports=Image;