import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // Which incident this message belongs to
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
    },

    // Who sent it
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    messageType: {
      type: String,
      default: "text",
    },
  },
  { timestamps: true }
);

// Index for fast paginated fetch of messages in chronological order
messageSchema.index({ incident: 1, createdAt: 1 });

export const Message = mongoose.model("Message", messageSchema);