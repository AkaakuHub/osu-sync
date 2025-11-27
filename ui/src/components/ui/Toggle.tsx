import React from "react";
import { tv } from "tailwind-variants";

const toggle = tv({
	base: "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
	variants: {
		checked: {
			true: "bg-primary",
			false: "bg-surface-variant",
		},
		disabled: {
			true: "opacity-50 cursor-not-allowed",
			false: "cursor-pointer",
		},
	},
	defaultVariants: {
		checked: false,
		disabled: false,
	},
});

const thumb = tv({
	base: "inline-block h-4 w-4 transform rounded-full bg-surface-foreground transition-transform shadow-sm",
	variants: {
		checked: {
			true: "translate-x-6",
			false: "translate-x-1",
		},
	},
});

type ToggleProps = {
	checked: boolean;
	onChange?: (checked: boolean) => void;
	disabled?: boolean;
	label?: string;
	className?: string;
	id?: string;
};

const Toggle: React.FC<ToggleProps> = ({
	checked,
	onChange,
	disabled = false,
	label,
	className,
	id,
}) => {
	const handleChange = () => {
		if (!disabled && onChange) {
			onChange(!checked);
		}
	};

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				id={id}
				role="switch"
				aria-checked={checked}
				aria-disabled={disabled}
				onClick={handleChange}
				disabled={disabled}
				className={toggle({ checked, disabled, className })}
			>
				<span className={thumb({ checked })} />
			</button>
			{label && (
				<label htmlFor={id} className="text-sm text-text cursor-pointer">
					{label}
				</label>
			)}
		</div>
	);
};

export default Toggle;