open Js_of_ocaml
module B = Elm_browser.Browser

(* The PDF resource adapter remains JavaScript. Pass its connect callback the
   app only after the shared library has mounted Elm and attached its ports. *)
let start connect ready failed =
  let fail message =
    ignore (Js.Unsafe.fun_call failed [| Js.Unsafe.inject (Js.string message) |]) in
  try
    let theme = B.attr (B.root ()) "data-theme" |> Option.value ~default:"dark" in
    Elm_browser.start ~mount:"app" ~storage_prefix:"pdf-tools"
      ~features:[Elm_browser.Storage] ~flags:(B.string theme)
      ~on_error:fail
      ~on_ready:(fun app connection ->
        try
          ignore (Js.Unsafe.fun_call connect [| Js.Unsafe.inject app |]);
          ignore (Js.Unsafe.fun_call ready [||])
        with exn ->
          Elm_browser.stop connection;
          fail (Printexc.to_string exn))
      ()
  with exn -> fail (Printexc.to_string exn)

let () =
  Js.export "PdfToolsBrowser"
    (Js.Unsafe.obj [| "start", Js.Unsafe.inject (Js.wrap_callback start) |])
