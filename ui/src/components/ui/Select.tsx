import React from "react";
import { tv } from "tailwind-variants";

const select = tv({
	base: "flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300",
});

const Select = React.forwardRef<
	HTMLSelectElement,
	React.SelectHTMLAttributes<HTMLSelectElement> & {
		children: React.ReactNode;
	}
>(({ className, children, ...props }, ref) => {
	return (
		<select className={select({ className })} ref={ref} {...props}>
			{children}
		</select>
	);
});

Select.displayName = "Select";

export default Select;
