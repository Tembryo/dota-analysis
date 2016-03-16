var shortid = require("shortid");

function safe_generate()
{
    var id = shortid.generate();
    id = id.replace(/0/g, "A_");
    id = id.replace(/1/g, "B_");
    id = id.replace(/2/g, "C_");
    id = id.replace(/3/g, "D_");
    id = id.replace(/4/g, "E_");
    id = id.replace(/5/g, "F_");
    id = id.replace(/6/g, "G_");
    id = id.replace(/7/g, "H_");
    id = id.replace(/8/g, "I_");
    id = id.replace(/9/g, "J_");
    id = id.replace(/-/g, "K_");

    return id;
}

exports.safe_generate = safe_generate;