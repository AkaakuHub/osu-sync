import React from "react";
import Button from "./Button";

type ModalProps = {
	title: string;
	body: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
	confirmVariant?: "primary" | "secondary" | "danger" | "ghost";
	disableConfirm?: boolean;
	isConfirmLoading?: boolean;
};

const Modal: React.FC<ModalProps> = ({
	title,
	body,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	onConfirm,
	onCancel,
	confirmVariant = "primary",
	disableConfirm,
	isConfirmLoading,
}) => {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm px-3">
			<div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl p-5">
				<div className="text-lg font-semibold text-text mb-2">{title}</div>
				<div className="text-sm text-text-secondary whitespace-pre-line mb-4">{body}</div>
				<div className="flex justify-end gap-2">
					<Button variant="ghost" onClick={onCancel}>
						{cancelLabel}
					</Button>
					<Button
						variant={confirmVariant === "danger" ? "error" : confirmVariant}
						onClick={onConfirm}
						disabled={disableConfirm}
						isLoading={isConfirmLoading}
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default Modal;
