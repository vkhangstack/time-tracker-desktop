import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"

interface PopupProps {
  /**
   * The element that triggers the popup to open.
   */
  trigger?: React.ReactNode
  /**
   * The title of the popup.
   */
  title: string
  /**
   * An optional description for the popup.
   */
  description?: string
  /**
   * The content of the popup.
   */
  children: React.ReactNode
  /**
   * Optional footer content (e.g., action buttons).
   */
  footer?: React.ReactNode
  /**
   * Controlled open state.
   */
  isOpen?: boolean
  /**
   * Callback for open state changes.
   */
  onOpenChange?: (open: boolean) => void
  /**
   * Additional class name for the content.
   */
  className?: string
}
/**
 * Example:
 * <Popup
 *   title="Delete Ac   count"
 *   description="Are you sure? This action cannot be undone."
 *   trigger={<Button variant="destructive">Delete</Button>}
 *   footer={<Button variant="destructive">Yes, Delete</Button>}
 * >
 *   <p className="text-sm">
 *     Please type "DELETE" to confirm.
 *   </p>
 * </Popup>
 */
export function Popup({
  trigger,
  title,
  description,
  children,
  footer,
  isOpen,
  onOpenChange,
  className,
}: PopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {title}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-2">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
