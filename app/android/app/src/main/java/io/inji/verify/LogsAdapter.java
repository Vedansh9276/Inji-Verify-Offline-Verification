package io.inji.verify;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import java.util.List;

public class LogsAdapter extends RecyclerView.Adapter<LogsAdapter.LogViewHolder> {
    
    private List<VerificationLog> logs;
    
    public LogsAdapter(List<VerificationLog> logs) {
        this.logs = logs;
    }
    
    @NonNull
    @Override
    public LogViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_log, parent, false);
        return new LogViewHolder(view);
    }
    
    @Override
    public void onBindViewHolder(@NonNull LogViewHolder holder, int position) {
        VerificationLog log = logs.get(position);
        
        holder.hashText.setText(log.getShortHash());
        holder.timestampText.setText(log.getFormattedTimestamp());
        
        // Set status icon and color
        if ("success".equals(log.getStatus())) {
            holder.statusIcon.setImageResource(R.drawable.ic_checkmark);
            holder.statusIcon.setColorFilter(ContextCompat.getColor(
                holder.itemView.getContext(), R.color.verification_success));
        } else {
            holder.statusIcon.setImageResource(R.drawable.ic_cross);
            holder.statusIcon.setColorFilter(ContextCompat.getColor(
                holder.itemView.getContext(), R.color.verification_failure));
        }
        
        // Set sync status
        if (log.isSynced()) {
            holder.syncIcon.setVisibility(View.VISIBLE);
            holder.syncIcon.setImageResource(R.drawable.ic_sync_done);
            holder.syncIcon.setColorFilter(ContextCompat.getColor(
                holder.itemView.getContext(), R.color.success));
        } else {
            holder.syncIcon.setVisibility(View.VISIBLE);
            holder.syncIcon.setImageResource(R.drawable.ic_sync_pending);
            holder.syncIcon.setColorFilter(ContextCompat.getColor(
                holder.itemView.getContext(), R.color.warning));
        }
    }
    
    @Override
    public int getItemCount() {
        return logs.size();
    }
    
    static class LogViewHolder extends RecyclerView.ViewHolder {
        ImageView statusIcon;
        TextView hashText;
        TextView timestampText;
        ImageView syncIcon;
        
        public LogViewHolder(@NonNull View itemView) {
            super(itemView);
            statusIcon = itemView.findViewById(R.id.log_status_icon);
            hashText = itemView.findViewById(R.id.log_hash);
            timestampText = itemView.findViewById(R.id.log_timestamp);
            syncIcon = itemView.findViewById(R.id.log_sync_icon);
        }
    }
}
