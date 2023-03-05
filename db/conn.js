const mongoose=require('mongoose');
const DB= process.env.DATABASE;

//Connecting to the Database 
mongoose.connect(DB,{useNewUrlParser:true,useCreateIndex:true,useUnifiedTopology:true,useFindAndModify:false}).then(()=>{
    console.log('Connection Successful');
}).catch((err)=>{
    console.log('No connection',err);
})
