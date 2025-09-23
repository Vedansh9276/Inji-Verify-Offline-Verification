package io.inji.verify;

public class VerificationLog {
    private String hash;
    private String status;
    private long timestamp;
    private boolean synced;
    
    public VerificationLog(String hash, String status, long timestamp, boolean synced) {
        this.hash = hash;
        this.status = status;
        this.timestamp = timestamp;
        this.synced = synced;
    }
    
    public String getHash() {
        return hash;
    }
    
    public void setHash(String hash) {
        this.hash = hash;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public long getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
    
    public boolean isSynced() {
        return synced;
    }
    
    public void setSynced(boolean synced) {
        this.synced = synced;
    }
    
    public String getFormattedTimestamp() {
        long now = System.currentTimeMillis();
        long diff = now - timestamp;
        
        if (diff < 60000) { // Less than 1 minute
            return "Just now";
        } else if (diff < 3600000) { // Less than 1 hour
            return (diff / 60000) + " minutes ago";
        } else if (diff < 86400000) { // Less than 1 day
            return (diff / 3600000) + " hours ago";
        } else {
            return (diff / 86400000) + " days ago";
        }
    }
    
    public String getShortHash() {
        if (hash.length() > 12) {
            return hash.substring(0, 12) + "...";
        }
        return hash;
    }
}
