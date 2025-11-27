import React from "react";

const Card = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & {
		children: React.ReactNode;
	}
>(({ className, children, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={`rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${className || ""}`}
			{...props}
		>
			{children}
		</div>
	);
});

const CardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & {
		children: React.ReactNode;
	}
>(({ className, children, ...props }, ref) => {
	return (
		<div ref={ref} className={`p-6 pt-0 ${className || ""}`} {...props}>
			{children}
		</div>
	);
});

Card.displayName = "Card";
CardContent.displayName = "CardContent";

export { CardContent };
export default Card;
