
const Image=require("../model/imageSchema");

const UserImageRendering=async(req,res,next)=>{
    try {
       
        const imagesUser=await Image.find({email:req.body.email});

        if(!imagesUser){
            throw new Error('User not found');
        }

    
        req.rootImage=imagesUser;
        

        next();
        
    } catch (error) {
        res.status(401).send('Something went wrong...');
        console.log(error);
    }
};

module.exports=UserImageRendering;