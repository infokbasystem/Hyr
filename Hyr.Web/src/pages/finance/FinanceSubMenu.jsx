import { NavLink } from "react-router-dom";
import bg from "../../assets/content.png";

import overviewIcon from "../../assets/appbar.page.powerpoint.svg";
import toBeInvoicedIcon from "../../assets/appbar.timer.black.svg";
import invoicesIcon from "../../assets/appbar.page.search.svg";
import newInvoiceIcon from "../../assets/appbar.draw.pen.black.svg";
import exportToAccountingIcon from "../../assets/appbar.money.black.svg";
import stockTakingIcon from "../../assets/appbar.list.two.svg";
import stockReportIcon from "../../assets/appbar.pie.svg";
import accountsReceivableIcon from "../../assets/appbar.currency.dollar.svg";

function IconImage({ src, className = "", width = "w-6", height = "h-6" }) {
    return <img src={src} alt="" className={[height, width, className].filter(Boolean).join(" ")} />;
}

const items = [
    { to: "/finance", label: "Overview", icon: overviewIcon, end: true },
    { to: "/finance/tobeinvoiced", label: "ToBeInvoiced", icon: toBeInvoicedIcon },
    { to: "/finance/invoices", label: "Invoices", icon: invoicesIcon },
    { to: "/finance/invoice/new", label: "NewInvoice", icon: newInvoiceIcon },
    { to: "/finance/exporttoaccounting", label: "ExportToAccounting", icon: exportToAccountingIcon },
    { to: "/finance/stocktaking", label: "StockTaking", icon: stockTakingIcon },
    { to: "/finance/stockreport", label: "StockReport", icon: stockReportIcon },
    { to: "/finance/accountsreceivable", label: "AccountsReceivable", icon: accountsReceivableIcon },
];

export default function FinanceSubMenu({ activeOverridePath = "" }) {
    return (
        <nav
            className="sticky top-[52px] z-20 flex items-end justify-center gap-0 px-8 pt-2 pb-4"
            style={{ backgroundImage: `url(${bg})` }}
        >
            {items.map((item) => {
                return (
                    <div className="ml-3 mr-3 flex justify-center" key={item.label}>
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
                                        <IconImage
                                            src={item.icon}
                                            width={item.iconWidth}
                                            height={item.iconHeight}
                                            className={
                                                resolvedActive
                                                    ? "opacity-100"
                                                    : "opacity-55 transition-opacity group-hover:opacity-100"
                                            }
                                        />
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
