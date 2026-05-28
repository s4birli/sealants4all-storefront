import { ShieldCheck, Phone } from "lucide-react";

export function UtilityBar() {
  return (
    <div className="utility">
      <div className="container">
        <div className="row">
          <div className="group">
            <span className="item">
              <span className="tick">
                <ShieldCheck size={14} strokeWidth={2} />
              </span>{" "}
              Free UK delivery over £150
            </span>
            <span className="item">
              <span className="tick">
                <ShieldCheck size={14} strokeWidth={2} />
              </span>{" "}
              Official UK distributor
            </span>
            <span className="item">
              <span className="tick">
                <ShieldCheck size={14} strokeWidth={2} />
              </span>{" "}
              Net-30 trade accounts
            </span>
          </div>
          <div className="group">
            <a href="#help" className="item">
              Help
            </a>
            <a href="#shipping" className="item">
              Delivery info
            </a>
            <a href="tel:02080503959" className="item">
              <Phone size={14} strokeWidth={2} /> 020 8050 3959
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
