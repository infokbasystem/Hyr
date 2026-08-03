import { NavLink } from "react-router-dom";
import {
    ChartNoAxesColumn,
    Search,
    FileStack,
    BadgeDollarSign,
    ListChecks,
    Sigma,
    Scale,
} from 'lucide-react'
import bg from "../../assets/content.png";

import overviewIcon from "../../assets/appbar.page.powerpoint.svg";
import toBeInvoicedIcon from "../../assets/appbar.timer.black.svg";
import invoicesIcon from "../../assets/appbar.page.search.svg";
import newInvoiceIcon from "../../assets/appbar.draw.pen.black.svg";
import exportToAccountingIcon from "../../assets/appbar.money.black.svg";
import stockTakingIcon from "../../assets/appbar.list.two.svg";
import stockReportIcon from "../../assets/appbar.pie.svg";
import accountsReceivableIcon from "../../assets/appbar.currency.dollar.svg";

const DEFAULT_ICON_WIDTH = "w-6";
const DEFAULT_ICON_HEIGHT = "h-6";

function IconImage({ src, className = "", width = DEFAULT_ICON_WIDTH, height = DEFAULT_ICON_HEIGHT }) {
    return <img src={src} alt="" className={[height, width, className].filter(Boolean).join(" ")} />;
}

const items = [
    { to: "/finance", label: "Overview", iconComponent: ChartNoAxesColumn, end: true },
    { to: "/finance/invoices", label: "Sök faktura", iconComponent: Search },
    { to: "/finance/tobeinvoiced", label: "ToBeInvoiced", iconComponent: FileStack, leftMargin: "ml-12" },
    { to: "/finance/invoice/new", label: "NewInvoice", iconComponent: BadgeDollarSign },
    { to: "/finance/stocktaking", label: "StockTaking", iconComponent: ListChecks, leftMargin: "ml-12" },
    { to: "/finance/stockreport", label: "StockReport", iconComponent: Sigma },
    { to: "/finance/exporttoaccounting", label: "Bokför", iconComponent: Scale, leftMargin: "ml-12" },
];

export default function FinanceSubMenu({ activeOverridePath = "" }) {
    return (
        <nav
            className="sticky top-[52px] z-20 flex items-end justify-center gap-0 px-8 pt-2 pb-4"
            style={{ backgroundImage: `url(${bg})` }}
        >
            {items.map((item) => {
                return (
                    <div className={["flex justify-center", item.leftMargin || "ml-4 mr-4"].filter(Boolean).join(" ")} key={item.label}>
                        <NavLink
                            to={item.to}
                            end={item.end}
                            onClick={item.disabled ? (event) => event.preventDefault() : undefined}
                            aria-disabled={item.disabled ? "true" : undefined}
                            className={({ isActive }) => {
                                const resolvedActive = !item.disabled && (isActive || (activeOverridePath && activeOverridePath === item.to));
                                return [
                                    "group flex select-none flex-col items-center pb-[1px] pt-1 text-tiny leading-tight transition-colors",
                                    resolvedActive
                                        ? "border-b-[3px] border-amber-500 text-stone-900"
                                        : "border-b-[3px] border-transparent text-stone-600 opacity-80 hover:text-stone-900 hover:opacity-100",
                                ]
                                    .filter(Boolean)
                                    .join(" ");
                            }}
                        >
                            {({ isActive }) => {
                                const resolvedActive = !item.disabled && (isActive || (activeOverridePath && activeOverridePath === item.to));

                                return (
                                    <>
                                        {item.iconComponent ? (
                                            <item.iconComponent
                                                className={[
                                                    item.iconHeight ?? DEFAULT_ICON_HEIGHT,
                                                    item.iconWidth ?? DEFAULT_ICON_WIDTH,
                                                    resolvedActive
                                                        ? "opacity-100"
                                                        : "opacity-100 transition-opacity group-hover:opacity-100",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                            />
                                        ) : (
                                            <IconImage
                                                src={item.icon}
                                                width={item.iconWidth ?? DEFAULT_ICON_WIDTH}
                                                height={item.iconHeight ?? DEFAULT_ICON_HEIGHT}
                                                className={
                                                    resolvedActive
                                                        ? "opacity-100"
                                                        : "opacity-55 transition-opacity group-hover:opacity-100"
                                                }
                                            />
                                        )}
                                        <span className="mt-1 whitespace-nowrap font-medium">{item.label}</span>
                                    </>
                                );
                            }}
                        </NavLink>
                    </div>
                );
            })}
        </nav>
    );
}
