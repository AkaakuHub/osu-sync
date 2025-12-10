import React from "react";
import { tv } from "tailwind-variants";

const input = tv({
	base: "flex h-8 p-2 w-full rounded-xl border border-border bg-surface text-base ring-offset-surface file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-border/80 shadow-sm hover:shadow-md",
	variants: {
		variant: {
			default: "",
			search:
				"text-lg px-4 bg-surface-variant/50 border-border/50 focus-visible:bg-surface focus-visible:border-primary/50 shadow-lg hover:shadow-xl",
		},
		error: {
			true: "border-error focus-visible:ring-error/50",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const Input = React.forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement> & {
		error?: string;
		variant?: "default" | "search";
	}
>(({ className, error, variant, ...props }, ref) => {
	const isRange = props.type === "range";

	if (isRange) {
		const merged = ["w-full h-2 accent-primary bg-border rounded-lg", className]
			.filter(Boolean)
			.join(" ");
		return <input className={merged} ref={ref} {...props} />;
	}

	return (
		<div className="space-y-1">
			<input className={input({ error: !!error, variant, className })} ref={ref} {...props} />
			{error && <p className="text-xs text-error">{error}</p>}
		</div>
	);
});

Input.displayName = "Input";

export default Input;
