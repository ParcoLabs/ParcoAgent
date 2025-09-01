// client/src/components/requests/AIComposerModal.tsx
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSendMessage,
  useSuggestResponses,
} from "@/lib/requests.hooks";

export type AIComposerModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  defaultTarget: "tenant" | "vendor" | "owner";
  defaultTo?: string; // email or phone prefill
};

export default function AIComposerModal({
  open,
  onOpenChange,
  requestId,
  defaultTarget,
  defaultTo,
}: AIComposerModalProps) {
  const [target, setTarget] = React.useState<"tenant" | "vendor" | "owner">(
    defaultTarget
  );
  const [channel, setChannel] = React.useState<"email" | "sms">("email");
  const [tone, setTone] = React.useState("Professional");
  const [to, setTo] = React.useState(defaultTo ?? "");
  const [body, setBody] = React.useState("");

  const suggest = useSuggestResponses();
  const send = useSendMessage();

  React.useEffect(() => {
    if (!open) return;
    setBody("");
    suggest.mutate(
      { requestId, target },
      { onSuccess: (suggestions) => setBody(suggestions[0] ?? "") }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requestId, target]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Draft Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select onValueChange={(v) => setTarget(v as any)} value={target}>
              <SelectTrigger>
                <SelectValue placeholder="Recipient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => setChannel(v as any)} value={channel}>
              <SelectTrigger>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="To (email or phone)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <Select onValueChange={setTone} value={tone}>
              <SelectTrigger>
                <SelectValue placeholder="Tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Friendly">Friendly</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Firm">Firm</SelectItem>
                <SelectItem value="Legalese">Legalese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() =>
              suggest.mutate(
                { requestId, target },
                { onSuccess: (s) => setBody(s[0] ?? "") }
              )
            }
          >
            Regenerate
          </Button>
          <Button
            disabled={send.isPending}
            onClick={() =>
              send.mutate(
                { requestId, to, channel, body },
                { onSuccess: () => onOpenChange(false) }
              )
            }
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
