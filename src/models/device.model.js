import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
    device_name: {
        type: String,
        required: true,
        trim: true
    },
    device_type: {
        type: String,
        enum: ['cleaning', 'kitchen', 'AC', 'fan', 'light', 'humidifier', "security"], 
        required: true,
        trim: true
    },
    status: {
        type: String,
        required: true,
        trim: true,
        default: false
    },
    energy_usage: {
        type: Map,
        of: Number,
        default: {} //"2025-03-15": 12.5
    },
    temperature: { // for AC
        type: Number,
        required: function () {
            return this.device_type === "AC";
        },
        default: null
    },
    brightness: {
        type: Number,
        min: 0,
        max: 100,
        required: function () {
            return this.device_type === "light";
        },
        default: null
    },
    fan_speed: {
        type: Number,
        min: 1,
        max: 8,
        required: function () {
            return this.device_type === "fan";
        },
        default: null
    },
    startTime: { 
        type: Date,
        required: function () {
            return (this.device_type === "cleaning" || this.device_type === "kitchen") ;
        },
        default: null
    },  
    expectedStopTime: { 
        type: Date,
        required: function () {
            return (this.device_type === "cleaning" || this.device_type === "kitchen") ;
        },
        default: null 
    }, 
    duration: { 
        type: Number,
        required: function () {
            return (this.device_type === "cleaning" || this.device_type === "kitchen") ;
        },
        default: null 
    }, 
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        default: null
    },
    house: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "House"
    }

},
{ timestamps: true });

const Device = mongoose.model('Device', deviceSchema);
export default Device;