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
			className={`rounded-xl border border-border bg-surface text-surface-foreground shadow-sm ${className || ""}`}
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
