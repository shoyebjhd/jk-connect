import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function TimerConflictModal({ open, runningLog, onStop, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Timer Already Running</DialogTitle>
          <DialogDescription>
            You have a timer running on <strong>{runningLog?.task?.title || "another task"}</strong>.
            Stop it first before starting a new one.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await onStop(runningLog.id);
              onCancel();
            }}
          >
            Stop Timer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
