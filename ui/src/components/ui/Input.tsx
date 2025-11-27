import React from "react";
import { tv } from "tailwind-variants";

const input = tv({
	base: "flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300",
	variants: {
		error: {
			true: "border-red-500 focus-visible:ring-red-500",
		},
	},
});

const Input = React.forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement> & {
		error?: string;
	}
>(({ className, error, ...props }, ref) => {
	return (
		<div className="space-y-1">
			<input className={input({ error: !!error, className })} ref={ref} {...props} />
			{error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
		</div>
	);
});

Input.displayName = "Input";

export default Input;
